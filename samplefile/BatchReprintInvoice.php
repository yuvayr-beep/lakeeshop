<?php 
	include_once 'logincheck.php'; 
	include 'includes/Fns.php';
	if(!empty($_GET['Error'])){$err=$_GET['Error'];} else{ $err=""; }
	if(!empty($_GET['Success'])){ $Succ=$_GET['Success']; } else { $Succ=""; }
?>
<!DOCTYPE html>
<html lang="en">
<head>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
	<title>Lakeeshop - Pack Batch Re-Print Invoice</title>
	<meta name="description" content="Winkle is a Dashboard & Admin Site Responsive Template by hencework." />
	<meta name="keywords" content="admin, admin dashboard, admin template, cms, crm, Winkle Admin, Winkleadmin, premium admin templates, responsive admin, sass, panel, software, ui, visualization, web app, application" />
	<meta name="author" content="hencework"/>
	
	<!-- Favicon -->
	<link rel="shortcut icon" href="favicon.ico">
	<link rel="icon" href="favicon.ico" type="image/x-icon">
    
	<!-- Data table CSS -->
	<link href="../vendors/bower_components/datatables/media/css/jquery.dataTables.min.css" rel="stylesheet" type="text/css"/>
	
	<!-- Custom CSS -->
	<link href="dist/css/style.css" rel="stylesheet" type="text/css">
</head>
<style>
	body {
	    color: #000000;
	    font-family: "Poppins", sans-serif;
	    font-size: 12px;
	    font-style: normal;
	    line-height: 1.5;
	    background: #192D46;
	    overflow-x: hidden;
	}
	.table > tbody > tr > td, .jsgrid-table > tbody > tr > td, .table > tbody > tr > th, .jsgrid-table > tbody > tr > th, .table > tfoot > tr > td, .jsgrid-table > tfoot > tr > td, .table > tfoot > tr > th, .jsgrid-table > tfoot > tr > th, .table > thead > tr > td, .jsgrid-table > thead > tr > td, .table > thead > tr > th, .jsgrid-table > thead > tr > th {
	    padding: 3px;
	    border-top: 2px solid #f5f5f5;
	    vertical-align: middle;
	}
	.pb-30 {
	    padding-bottom: 10px !important;
	}
	.btn.btn-circle, .fixed-sidebar-left .side-nav > li > a.btn-circle.documentation-btn, .wizard > .actions a.btn-circle, .dt-buttons .btn-circle.dt-button, .tablesaw-sortable th.tablesaw-sortable-head button.btn-circle, .sweet-alert button.btn-circle, .owl-theme .owl-nav .btn-circle[class*="owl-"], button.btn-circle.fc-agendaDay-button.fc-state-default.fc-corner-right, button.btn-circle.fc-month-button.fc-state-default.fc-corner-left, button.btn-circle.fc-agendaWeek-button, .btn-circle.fc-prev-button, .btn-circle.fc-next-button, .btn-circle.fc-today-button {
	    height: 32px;
	    width: 32px;
	    padding: 0;
	    border-radius: 50%;
	}
	.page-wrapper {
	    margin-left: 250px;
	    padding: 0px 20px;
	    position: relative;
	    background: #fff;
	    -webkit-transition: all 0.4s ease;
	    -moz-transition: all 0.4s ease;
	    transition: all 0.4s ease;
	    left: 0;
	}
</style>
<body>
	<!--Preloader-->
	<div class="preloader-it">
		<div class="la-anim-1"></div>
	</div>
	<!--/Preloader-->
    <div class="wrapper theme-1-active navbar-top-violet horizontal-nav">
		<!-- Top Menu Items -->
			<?php include 'widget/header.php'; ?>
			<!-- /Top Menu Items -->
		<!-- Main Content -->
		<div class="page-wrapper">
			<div class="container-fluid">
			</div>
			<!-- /Title -->
			<!-- Row -->
			<div class="row" style="padding-top:10px;">
				<div class="col-sm-12">
					<div class="panel panel-default card-view">
						<div class="panel-heading" style="padding: 15px 15px; padding-bottom: 0px;">
								<center><span id="msg"></span></center>	
							<div class="pull-left">
								<h6 class="panel-title txt-dark" style="padding-top: 7px;">Batch Re-Print Invoice</h6><br><br>
							</div>
							<div class="clearfix"></div>
						</div>
						<div class="panel-wrapper collapse in">
							<div class="panel-body" style="padding-top: 0px;padding-bottom: 7px;">
								<div class="row">
									<form method="POST" id="subform" name="subform" action="includes/code128/PrintInvoiceBatch.php" ></form>
									<div class="col-md-4">
										<div class="form-group">
											<label class="control-label mb-10">Client Name</label>
											<?php $sqlclt = "SELECT `vsorder`.`vorCltRefID`,`vsmanageclient`.`vmcCltName` FROM `vsorder` LEFT JOIN `vsmanageclient` ON `vsmanageclient`.`vmcCltRefID`=`vsorder`.`vorCltRefID` GROUP BY `vsorder`.`vorCltRefID`"; $resclt = $mysqli->query($sqlclt); ?>
												<select class="form-control" id="vorCltRefID" name="vorCltRefID">
													<option value="0">Select</option>
													<?php if($resclt) { while($rowclt=$resclt->fetch_assoc()) { ?>
													<option value="<?php echo $rowclt['vorCltRefID'] ?>"><?php echo $rowclt['vmcCltName'] ?></option>
													<?php }} ?>
												</select>
										</div>
									</div>
								<div class="col-md-4">
									<div class="form-group">
										<label class="control-label mb-10">Start Date</label>
										<input type="date" class="form-control" id="fromdate" name="fromdate">
									</div>
								</div>
								<div class="col-md-4">
									<div class="form-group">
										<label class="control-label mb-10">End Date</label>
										<input type="date" class="form-control" id="todate" name="todate">
									</div>
								</div>
								<!--/span-->
							</div>
							<div class="row">
								<div class="form-group">
									
									<input type="radio" id="chk1" name="group" value="1"> Source Order ID
									<input type="radio" id="chk2" name="group" value="2"> Order Reference Number
									<input type="radio" id="chk3" name="group" value="3"> Pack Reference Number<br><br>
									<div class="form-group">
										<textarea class="form-control" rows="7" id="vsaDesc"></textarea>
									</div>
								</div>
								<div class="row">
									<div class="col-md-5">
									    <button type="button" id="searBtn" class="btn btn-info" style="padding-left: 10px;">Search <i class="fa fa-search" aria-hidden="true"></i></button>
									</div>
									<div class="col-md-7">
									<div class="form-group" style="float: inline-end;">
										<button type="submit" form="subform" class="btn btn-default" style="padding-left: 25px;" align="center" formaction="includes/code128/SingleInvoiceBatch.php">1X1</button>
										<button type="submit" form="subform" class="btn btn-default" style="padding-left: 25px;" align="center" formaction="includes/PrintInvoiceBatch.php">1X4 WORD</button>
										<button type="submit" form="subform" class="btn btn-default" style="padding-left: 25px;" align="center" formaction="includes/PrintSingleInvoiceBatch.php">1X1 WORD</button>
										<button type="submit" form="subform" class="btn btn-default" style="padding-left: 25px;" align="center" onclick="this.form.target='_blank';return true;">1X4 PDF</button>
										<!-- <button type="submit" form="subform" class="btn btn-default" style="padding-left: 25px;" align="center">label</button>
										<button type="submit" form="subform" class="btn btn-default" style="padding-left: 25px;" align="center" formaction="includes/code128/PackingSlipOCBatch.php">Packing Slip</button> -->
										<button type="submit" form="subform" class="btn btn-default" style="padding-left: 25px;" align="center" formaction="includes/code128/SingleInvoiceBatch2.php">1X1 Invoice</button>
										<button type="submit" form="subform" class="btn btn-default" style="padding-left: 25px;" align="center" formaction="includes/code128/MultiInvoiceBatch.php">1X1 DC</button>
									</div>
								</div>
								</div>
								
							<div class="table-wrap">
								<div class="table-wrap mt-40">
									<div class="table-responsive">
										<table class="table mb-0">
											<thead>
												<tr>
													<th>S.No</th>
													<th>Order Type</th>
													<th>Order No</th>
													<th>Record Status</th>
													<th>Reason</th>
												</tr>
											</thead>
											<tbody id="TabBody">

											</tbody>
										</table>
									</div>
								</div>
							</div>
							</div>
						</div>
					</div>
				</div>
			</div>	
		</div>


			<!-- Footer -->
			<!-- <?php include 'widget/footer.php'; ?> -->
			<!-- /Footer -->
			
		
		<!-- /Main Content -->

    </div>
	</div>
    <!-- /#wrapper -->
	
	<!-- JavaScript -->
	
    <!-- jQuery -->
    <script src="../vendors/bower_components/jquery/dist/jquery.min.js"></script>

    <!-- Bootstrap Core JavaScript -->
    <script src="../vendors/bower_components/bootstrap/dist/js/bootstrap.min.js"></script>
    
	<!-- Data table JavaScript -->
	<script src="../vendors/bower_components/datatables/media/js/jquery.dataTables.min.js"></script>
	<script src="dist/js/dataTables-data.js"></script>
	
	<!-- Slimscroll JavaScript -->
	<script src="dist/js/jquery.slimscroll.js"></script>
	
	<!-- Owl JavaScript -->
	<script src="../vendors/bower_components/owl.carousel/dist/owl.carousel.min.js"></script>
	
	<!-- Switchery JavaScript -->
	<script src="../vendors/bower_components/switchery/dist/switchery.min.js"></script>
	
	<!-- Fancy Dropdown JS -->
	<script src="dist/js/dropdown-bootstrap-extended.js"></script>
	
	<!-- Init JavaScript -->
	<script src="dist/js/init.js"></script>
	
	<script  src="dist/js/timeout.js"></script>
	<script  src="dist/js/usertype.js"></script>

	<script>
	
	$(document).ready(function() {
		
		var err = "<?= $err; ?>";
		var succ = "<?= $Succ; ?>";
		if(err!=""){ displaymessage(err);}
		if(succ!=""){ displaymessage(succ);}
		
    });

	$("#searBtn").on('click',function(){
		var cltid = $("#vorCltRefID").val();
		var fromdate = $("#fromdate").val();
		var todate = $("#todate").val();
		var rv = $("input[name='group']:checked").val();
		var vsaDesc = $("#vsaDesc").val();
		//console.log(vsaDesc);
		vsaDesc = vsaDesc.replace(/(\r\n|\n|\r)/gm, ",");
		//console.log(vsaDesc);
		var ordertype = "";

		if(rv == "1"){
			ordertype = "SOURCE ORDER ID";
		} else if(rv == "2") {
			ordertype = "ORDER REFERENCE NUMBER";
		} else if(rv == "3") {
			ordertype = "PACK REFERENCE NUMBER";
		} 

		if(vsaDesc == ""){
			displaymessage("Please type any number in Text Box");
		} else if (rv == null) {
			displaymessage("Select any radio button option");
		} else {
			$("#vorCltRefID").prop('disabled',true);
			$("#fromdate").prop('disabled',true);
			$("#todate").prop('disabled',true);
			$("#vsaDesc").prop('disabled',true);
			$("input[name='group']").each(function(){
				$(this).prop('disabled',true);
			});
			$.ajax({
				type: "POST",
	 			url: 'includes/fetchBatchPrintInv.php',
	 			data: {fromdate:fromdate, todate:todate, cltid:cltid, rv:rv, vsaDesc:vsaDesc},
	 			dataType: 'json',
	 			success: function (data) {
					//if(data.hasOwnProperty('Error')){
					//	displaymessage(data.Error);
					//} else {
					$("#TabBody").empty();
					for (var i = 0; i < data.length; i++) {
						var slno = i + 1;
						var reason = "";
						var inputhidden = "";
						if(data[i][1] == "FAIL") { 
							reason = ordertype + " IS INVALID";
						} else {
							inputhidden = "<input type='hidden' form='subform' name='ordtyp[]' value='"+rv+"'>"+"<input type='hidden' form='subform' name='ordno[]' value='"+data[i][0]+"'>";
						}
						var Tadd = "<tr><td><span class='slno'>"+slno+"</span></td><td><span>"+ordertype+"</span>"+inputhidden+"</td><td><span>"+data[i][0]+"</span></td><td><span>"+data[i][1]+"</span></td><td><span>"+reason+"</span></td></tr>";
						$("#TabBody").append(Tadd);
					}	
				//	}

	 			}
	 		});
		}
	});
	</script>
	
	
</body>

</html>
